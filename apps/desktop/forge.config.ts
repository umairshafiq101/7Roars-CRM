import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { resolve, join, dirname } from "path";
import { copy, mkdirs, realpathSync } from "fs-extra";
import { existsSync, lstatSync } from "fs";

function resolvePackagePath(nodeModulesDir: string, pkg: string): string | null {
  const candidate = join(nodeModulesDir, pkg);
  if (!existsSync(candidate)) return null;
  const stat = lstatSync(candidate);
  if (stat.isSymbolicLink()) {
    return realpathSync(candidate);
  }
  return candidate;
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: "./assets/icon",
    name: "7Roars Agent",
    executableName: "7roars-agent",
  },
  rebuildConfig: {},
  hooks: {
    async packageAfterCopy(_forgeConfig, buildPath) {
      const nativePackages = ["sharp", "uiohook-napi", "sql.js"];
      const sourceNodeModules = resolve(".", "node_modules");
      const destNodeModules = resolve(buildPath, "node_modules");

      for (const pkg of nativePackages) {
        const realSrc = resolvePackagePath(sourceNodeModules, pkg);
        if (!realSrc) {
          console.warn(`[hook] Skipped ${pkg} (not found)`);
          continue;
        }
        const dest = join(destNodeModules, pkg);
        await mkdirs(dirname(dest));
        await copy(realSrc, dest, { dereference: true });
        console.log(`[hook] Copied ${pkg} from ${realSrc}`);

        // For sharp: also copy @img sibling from pnpm store (native bindings)
        if (pkg === "sharp") {
          const sharpParent = dirname(realSrc);
          const imgSrc = join(sharpParent, "@img");
          if (existsSync(imgSrc)) {
            const imgDest = join(destNodeModules, "@img");
            await copy(imgSrc, imgDest, { dereference: true });
            console.log(`[hook] Copied @img from ${imgSrc}`);
          }
          // Also copy other sharp peer deps from pnpm store
          for (const peer of ["color", "detect-libc", "semver"]) {
            const peerSrc = join(sharpParent, peer);
            if (existsSync(peerSrc)) {
              await copy(peerSrc, join(destNodeModules, peer), { dereference: true });
              console.log(`[hook] Copied ${peer} (sharp dep)`);
            }
          }
        }
      }
    },
  },
  makers: [
    new MakerSquirrel({
      name: "7RoarsAgent",
      authors: "7Roars Digital Agency",
      description: "7Roars Agency OS — Desktop Time Tracking Agent",
      setupIcon: "./assets/icon.ico",
      iconUrl:
        "https://raw.githubusercontent.com/7roars/agency-os/main/assets/icon.ico",
    }),
    new MakerZIP({}, ["darwin", "linux"]),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main/index.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
