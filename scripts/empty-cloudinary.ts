import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function deleteAllForResourceType(resourceType: 'image' | 'video' | 'raw') {
  console.log(`\n--- Purging all resources of type: [${resourceType}] ---`);
  let round = 1;
  let nextCursor: string | undefined = undefined;

  while (true) {
    try {
      console.log(`Calling delete_all_resources for ${resourceType} (round ${round})...`);
      const options: Record<string, any> = {
        resource_type: resourceType,
        type: 'upload',
        all: true,
        keep_original: false,
      };
      if (nextCursor) {
        options.next_cursor = nextCursor;
      }

      const res: any = await cloudinary.api.delete_all_resources(options);
      const deletedCount = res.deleted ? Object.keys(res.deleted).length : 0;
      console.log(`Round ${round}: Deleted ${deletedCount} assets.`);

      if (res.partial && res.next_cursor) {
        nextCursor = res.next_cursor;
        round++;
      } else {
        break;
      }
    } catch (err: any) {
      console.error(`Error deleting ${resourceType} via delete_all_resources:`, err.message);
      break;
    }
  }

  // Double-check with resources listing to catch any remaining items
  let remainingCount = 0;
  let checkCursor: string | undefined = undefined;
  do {
    const listRes: any = await cloudinary.api.resources({
      resource_type: resourceType,
      type: 'upload',
      max_results: 100,
      next_cursor: checkCursor,
    });
    const ids = listRes.resources?.map((r: any) => r.public_id) || [];
    if (ids.length > 0) {
      console.log(`Purging lingering batch of ${ids.length} [${resourceType}] resources by ID...`);
      await cloudinary.api.delete_resources(ids, { resource_type: resourceType, type: 'upload' });
      remainingCount += ids.length;
    }
    checkCursor = listRes.next_cursor;
  } while (checkCursor);

  if (remainingCount > 0) {
    console.log(`Purged an additional ${remainingCount} lingering [${resourceType}] assets.`);
  } else {
    console.log(`All [${resourceType}] upload assets cleared.`);
  }
}

async function getAllSubfolderPaths(folderPath: string): Promise<string[]> {
  const paths: string[] = [];
  try {
    const res = await cloudinary.api.sub_folders(folderPath);
    if (res.folders && res.folders.length > 0) {
      for (const folder of res.folders) {
        paths.push(folder.path);
        const nested = await getAllSubfolderPaths(folder.path);
        paths.push(...nested);
      }
    }
  } catch (err: any) {
    // Ignore if folder doesn't exist or is empty
  }
  return paths;
}

async function deleteFolderTree(rootFolder: string) {
  console.log(`\n--- Cleaning up folder tree: [${rootFolder}] ---`);
  try {
    const subfolders = await getAllSubfolderPaths(rootFolder);
    // Sort deepest first (longest path length first)
    subfolders.sort((a, b) => b.length - a.length);

    for (const sub of subfolders) {
      try {
        await cloudinary.api.delete_folder(sub);
        console.log(`Deleted subfolder: ${sub}`);
      } catch (err: any) {
        console.log(`Could not delete subfolder ${sub}: ${err.message}`);
      }
    }

    try {
      await cloudinary.api.delete_folder(rootFolder);
      console.log(`Deleted root folder: ${rootFolder}`);
    } catch (err: any) {
      console.log(`Could not delete root folder ${rootFolder}: ${err.message}`);
    }
  } catch (err: any) {
    console.error(`Error deleting folder tree ${rootFolder}:`, err.message);
  }
}

async function verifyEmpty() {
  console.log('\n================ VERIFICATION ================');
  for (const resourceType of ['image', 'video', 'raw'] as const) {
    const res: any = await cloudinary.api.resources({
      resource_type: resourceType,
      type: 'upload',
      max_results: 100,
    });
    const count = res.resources?.length || 0;
    console.log(`Remaining [${resourceType}] assets: ${count}`);
    if (count > 0) {
      console.log(`Sample remaining:`, res.resources.slice(0, 3).map((r: any) => r.public_id));
    }
  }

  try {
    const rootFolders = await cloudinary.api.root_folders();
    console.log('Remaining Root Folders:', rootFolders.folders?.map((f: any) => f.name));
  } catch (err: any) {
    console.log('Error querying root folders:', err.message);
  }
  console.log('==============================================\n');
}

async function main() {
  console.log(`Starting full Cloudinary wipe for account: [${process.env.CLOUDINARY_CLOUD_NAME}]`);

  // 1. Delete all assets by resource type
  await deleteAllForResourceType('image');
  await deleteAllForResourceType('raw');
  await deleteAllForResourceType('video');

  // 2. Delete folders
  const foldersToClean = ['zamzam_crm', 'test', 'test_debug', 'test_folder'];
  for (const folder of foldersToClean) {
    await deleteFolderTree(folder);
  }

  // 3. Final verification
  await verifyEmpty();
  console.log('Cloudinary purge completed successfully.');
}

main().catch((err) => {
  console.error('Fatal error during Cloudinary purge:', err);
  process.exit(1);
});
