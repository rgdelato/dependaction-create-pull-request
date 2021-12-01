/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 81:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 837:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const fs = __nccwpck_require__(147);
const util = __nccwpck_require__(837);
const exec = util.promisify((__nccwpck_require__(81).exec));

const workspace = process.env["GITHUB_WORKSPACE"];
const { packages } = JSON.parse(process.argv[2]);

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

})();

module.exports = __webpack_exports__;
/******/ })()
;