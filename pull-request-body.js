const core = require("@actions/core");
const { Octokit } = require("@octokit/core");

const token = process.argv[2];
const matrix = JSON.parse(JSON.parse(process.argv[3]));

// const octokit = new Octokit({ auth: token });

let body = "";

body += listOfPackages(matrix.packages);

body += `<details>
<summary>Release notes</summary>
<p><em>Sourced from <a href="https://github.com/servicetitan/anvil/releases"><code>@​servicetitan/tokens</code>'s releases</a>.</em></p>
<blockquote>

## Features

- \`[jest-config]\` Support comments in JSON config file ([#12316](https://github.com/facebook/jest/pull/12316))
- \`[pretty-format]\` Expose \`ConvertAnsi\` plugin ([#12308](https://github.com/facebook/jest/pull/12308))

## Fixes

- \`[expect]\` Add type definitions for asymmetric \`closeTo\` matcher ([#12304](https://github.com/facebook/jest/pull/12304))
- \`[jest-cli]\` Load binary via exported API ([#12315](https://github.com/facebook/jest/pull/12315))
- \`[jest-config]\` Replace \`jsonlint\` with \`parse-json\` ([#12316](https://github.com/facebook/jest/pull/12316))
- \`[jest-repl]\` Make module importable ([#12311](https://github.com/facebook/jest/pull/12311) & [#12315](https://github.com/facebook/jest/pull/12315))

## Chore & Maintenance

- \`[*]\` Avoid anonymous default exports ([#12313](https://github.com/facebook/jest/pull/12313))

## New Contributors
* @zoltan-boros made their first contribution in https://github.com/facebook/jest/pull/12206

**Full Changelog**: https://github.com/facebook/jest/compare/v27.5.0...v27.5.1

</blockquote>
</details>`;

core.setOutput("body", body);

function allUniqueURLs(packages) {
  const packagesWithoutTypes = packages.filter(
    ({ name }) => !name.startsWith("@types")
  );

  const setOfURLs = new Set([...packagesWithoutTypes.map(({ url }) => url)]);

  return [...setOfURLs];
}

function listOfPackages(packages) {
  let text = "";

  for (const {
    name,
    currentVersion,
    latestVersion,
    url,
  } of packagesWithMetadata) {
    if (url) {
      text += `${
        packages.length > 1 ? "- " : ""
      }Bumps [${name}](${url}) from ${currentVersion} to ${latestVersion}\n`;
    } else {
      text += `${
        packages.length > 1 ? "- " : ""
      }Bumps ${name} from ${currentVersion} to ${latestVersion}\n`;
    }
  }

  return text;
}
