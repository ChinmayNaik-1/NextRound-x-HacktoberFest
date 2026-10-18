const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const frontendDir = path.resolve(__dirname, '..', 'frontend');
const backendExecutable = path.resolve(
  frontendDir,
  '..',
  'backend',
  'dist',
  'NextRoundBackend',
  'NextRoundBackend.exe',
);
const releaseDir = path.join(frontendDir, 'release');
const artifactName = 'NextRound-Setup.exe';

async function main() {
  if (process.platform !== 'win32') {
    throw new Error('The Windows installer must be built on Windows.');
  }
  if (!fs.existsSync(backendExecutable)) {
    throw new Error(
      'The packaged backend is missing. Run "npm run package:backend" first.',
    );
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nextround-installer-'));
  const outputDir = path.join(tempDir, 'release');
  const electronBuilderPath = require.resolve('electron-builder', {
    paths: [frontendDir],
  });
  const { Arch, Platform, build } = require(electronBuilderPath);

  process.chdir(frontendDir);
  try {
    await build({
      targets: Platform.WINDOWS.createTarget('nsis', Arch.x64),
      config: {
        directories: {
          output: outputDir,
        },
      },
    });

    fs.mkdirSync(releaseDir, { recursive: true });
    for (const name of [artifactName, `${artifactName}.blockmap`]) {
      const source = path.join(outputDir, name);
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, path.join(releaseDir, name));
      }
    }
    console.log(`Windows installer created: ${path.join(releaseDir, artifactName)}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
