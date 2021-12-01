const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const workspace = process.env["GITHUB_WORKSPACE"];
const packages = JSON.parse(process.argv[2]).packages;

console.log("process.argv[2]:", process.argv[2]);
console.log("JSON.parse(process.argv[2]):", JSON.parse(process.argv[2]));
console.log("packages:", typeof packages, packages);

updateAllDependencies();

async function updateAllDependencies(path = "") {
  const dependencyGroups = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ];

  const files = fs.readdirSync(`${workspace}/${path}`, { withFileTypes: true });

  for (const directoryEntry of files) {
    if (directoryEntry.name === "package.json") {
      const packageJSON = JSON.parse(
        fs.readFileSync(`${workspace}/${path}/${directoryEntry.name}`, "utf8")
      );

      for (const packageData of packages) {
        for (const dependencyGroup of dependencyGroups) {
          const { name: packageName, latestVersion } = packageData;

          if (
            packageJSON[dependencyGroup] &&
            packageJSON[dependencyGroup][packageName]
          ) {
            await updatePackageDependency(
              path,
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
        `${workspace}/${path}/${directoryEntry.name}`,
        {
          withFileTypes: true,
        }
      );

      for (const packagesDirectoryEntry of packagesDirectoryFiles) {
        const packageJSON = JSON.parse(
          fs.readFileSync(
            `${workspace}/${path}/${directoryEntry.name}/${packagesDirectoryEntry.name}/package.json`,
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
                `${workspace}/${path}/${directoryEntry.name}/${packagesDirectoryEntry.name}`,
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
  if (current.indexOf("||") !== -1) {
    return current;
  }

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
