const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const { packages } = JSON.parse(JSON.parse(process.argv[2]));

updateAllDependencies();

async function updateAllDependencies(path) {
  const workspace = process.env.GITHUB_WORKSPACE;
  const fullPath = path ? `${workspace}/${path}` : workspace;

  const dependencyGroups = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ];

  const files = fs.readdirSync(fullPath, { withFileTypes: true });

  for (const directoryEntry of files) {
    if (directoryEntry.name === "package.json") {
      const packageJSON = JSON.parse(
        fs.readFileSync(`${fullPath}/${directoryEntry.name}`, "utf8")
      );

      for (const packageData of packages) {
        for (const dependencyGroup of dependencyGroups) {
          const { name: packageName, latestVersion } = packageData;

          if (
            packageJSON[dependencyGroup] &&
            packageJSON[dependencyGroup][packageName]
          ) {
            await updatePackageDependency(
              fullPath,
              dependencyGroup,
              packageName,
              getUpdatedVersion(
                packageJSON[dependencyGroup][packageName],
                latestVersion
              )
            );
          }
        }
      }
    } else if (
      directoryEntry.isDirectory() &&
      directoryEntry.name === "packages"
    ) {
      const packagesDirectoryFiles = fs.readdirSync(
        `${fullPath}/${directoryEntry.name}`,
        {
          withFileTypes: true,
        }
      );

      for (const packagesDirectoryEntry of packagesDirectoryFiles) {
        const packageJSON = JSON.parse(
          fs.readFileSync(
            `${fullPath}/${directoryEntry.name}/${packagesDirectoryEntry.name}/package.json`,
            "utf8"
          )
        );

        for (const packageData of packages) {
          for (const dependencyGroup of dependencyGroups) {
            const { name: packageName, latestVersion } = packageData;

            if (
              packageJSON[dependencyGroup] &&
              packageJSON[dependencyGroup][packageName]
            ) {
              await updatePackageDependency(
                `${fullPath}/${directoryEntry.name}/${packagesDirectoryEntry.name}`,
                dependencyGroup,
                packageName,
                getUpdatedVersion(
                  packageJSON[dependencyGroup][packageName],
                  latestVersion
                )
              );
            }
          }
        }
      }
    }
  }
}

function getUpdatedVersion(current, latest) {
  // TODO: Handle peerDependencies such as "^16 || ^17"
  // if (current.indexOf("||") !== -1) {
  //   return latest;
  // }

  const semverRangeMatch = current.match(/\D*/);
  const semverRange = (semverRangeMatch && semverRangeMatch[0]) || "";
  return `${semverRange}${latest}`;
}

async function updatePackageDependency(path, dependencyGroup, key, value) {
  try {
    console.log(`Updating ${key} (${dependencyGroup}) in ${path}...`);
    await exec(`cd ${path} && npm pkg set ${dependencyGroup}.${key}=${value}`);
  } catch (err) {
    console.error(err);
  }
}
