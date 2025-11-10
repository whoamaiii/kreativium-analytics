#!/usr/bin/env node
/**
 * Remove React.FC type annotations from TSX components
 * Converts: export const Component: React.FC<Props> = ({ prop1 }) => ...
 * To: export const Component = ({ prop1 }: Props) => ...
 */

import fs from "fs";
import path from "path";

const DEFAULT_OPTIONS = {
  dryRun: false,
  verbose: true,
};

function removeReactFC(content, filePath = "") {
  let modified = false;
  let result = content;

  // Pattern 1: React.FC with generic type in arrow function
  // Matches: export const Name: React.FC<TypeName> = ({ prop1, prop2 }) => ...
  const pattern1 = /(\s*(?:export\s+)?const\s+\w+):\s*React\.FC<([^>]+)>\s*=\s*(\(\s*\{[^}]*\}[^)]*)\)/g;
  result = result.replace(pattern1, (match, nameDecl, typeArg, params) => {
    modified = true;
    if (filePath && DEFAULT_OPTIONS.verbose) {
      console.log(`  ${filePath}: Updated React.FC<${typeArg}>`);
    }
    // params doesn't include the closing paren (captured separately), so add it back with type annotation
    return `${nameDecl} = ${params}: ${typeArg})`;
  });

  // Pattern 2: React.FC without generic (no props)
  // Matches: export const Name: React.FC = () => ...
  const pattern2 = /(\s*(?:export\s+)?const\s+\w+):\s*React\.FC\s*=/g;
  result = result.replace(pattern2, (match, nameDecl) => {
    modified = true;
    if (filePath && DEFAULT_OPTIONS.verbose) {
      console.log(`  ${filePath}: Updated React.FC (no props)`);
    }
    return `${nameDecl} =`;
  });

  // Pattern 3: React.FC in type position with memo wrapper
  // Matches: export const Name: React.FC<Props> = React.memo(({ prop1 }) => ...
  const pattern3 = /(\s*(?:export\s+)?const\s+\w+):\s*React\.FC<([^>]+)>\s*=\s*((?:React\.)?memo\s*\(\s*\(\s*\{[^}]*\}[^)]*)\)/g;
  result = result.replace(pattern3, (match, nameDecl, typeArg, memoStart) => {
    modified = true;
    if (filePath && DEFAULT_OPTIONS.verbose) {
      console.log(`  ${filePath}: Updated React.FC<${typeArg}> with memo`);
    }
    return `${nameDecl} = ${memoStart}: ${typeArg})`;
  });

  // Pattern 4: Inline type definitions
  // Matches: export const Name: React.FC<{ data: string }> = ({ data }) => ...
  const pattern4 = /(\s*(?:export\s+)?const\s+\w+):\s*React\.FC<(\{[^}]+\})>\s*=\s*(\(\s*\{[^}]*\}[^)]*)\)/g;
  result = result.replace(pattern4, (match, nameDecl, typeArg, params) => {
    modified = true;
    if (filePath && DEFAULT_OPTIONS.verbose) {
      console.log(`  ${filePath}: Updated React.FC with inline type`);
    }
    return `${nameDecl} = ${params}: ${typeArg})`;
  });

  return { result, modified };
}

function processFiles(tsxFiles, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results = { processed: 0, modified: 0, errors: 0, files: [] };

  tsxFiles.forEach((filePath) => {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const { result, modified } = removeReactFC(content, filePath);

      if (modified) {
        results.files.push({
          path: filePath,
          status: "modified",
        });

        if (!opts.dryRun) {
          fs.writeFileSync(filePath, result, "utf-8");
        }
        results.modified++;
      } else {
        results.files.push({
          path: filePath,
          status: "no-changes",
        });
      }
      results.processed++;
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
      results.errors++;
    }
  });

  return results;
}

function findTsxFiles(baseDir = ".") {
  const files = [];
  const ignore = ["node_modules", ".git", "dist", ".vite", "build"];

  function traverse(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (ignore.includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          traverse(fullPath);
        } else if (entry.name.endsWith(".tsx")) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }

  traverse(baseDir);
  return files;
}

// Main execution
function main() {
  const isDryRun = process.argv.includes("--dry-run");
  // Find non-flag arguments (skip node and script name, which are argv[0] and argv[1])
  const nonFlagArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const baseDir = nonFlagArgs.length > 0 ? nonFlagArgs[0] : ".";

  console.log(`\nRemoving React.FC type annotations...`);
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "WRITE MODE"}\n`);

  try {
    const tsxFiles = findTsxFiles(baseDir);

    if (tsxFiles.length === 0) {
      console.log("No TSX files found.");
      return;
    }

    console.log(`Found ${tsxFiles.length} TSX files.\n`);

    const results = processFiles(tsxFiles, { dryRun: isDryRun });

    console.log("\n=== Summary ===");
    console.log(`Total files processed: ${results.processed}`);
    console.log(`Files modified: ${results.modified}`);
    console.log(`Errors: ${results.errors}`);

    if (isDryRun) {
      console.log("\nDry run complete. No files were modified.");
    } else {
      console.log("\nChanges written to disk.");
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
