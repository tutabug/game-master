#!/usr/bin/env node

import { execSync } from 'child_process';
import * as path from 'path';

interface ConvertOptions {
  outputDir?: string;
  force?: boolean;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.error('Usage: pnpm convert-pdf <pdf-file> [options]');
    console.error('');
    console.error('Description:');
    console.error('  Convert a PDF file to Markdown using marker-pdf (Python).');
    console.error(
      '  On first run, will create a Python virtual environment and install dependencies.',
    );
    console.error('');
    console.error('Options:');
    console.error('  -o, --output-dir <dir>  Output directory (default: documents/markdown)');
    console.error('  -f, --force             Overwrite existing files');
    console.error('');
    console.error('Examples:');
    console.error('  pnpm convert-pdf documents/SRD_CC_v5.2.1.pdf');
    console.error('  pnpm convert-pdf documents/manual.pdf -o output/md --force');
    process.exit(1);
  }

  const pdfFile = args[0];
  const options: ConvertOptions = {};

  for (let i = 1; i < args.length; i++) {
    if ((args[i] === '-o' || args[i] === '--output-dir') && args[i + 1]) {
      options.outputDir = args[i + 1];
      i++;
    } else if (args[i] === '-f' || args[i] === '--force') {
      options.force = true;
    }
  }

  const scriptPath = path.join(process.cwd(), 'scripts', 'convert-pdf.sh');

  const cmdArgs = [pdfFile];
  if (options.outputDir) {
    cmdArgs.push('-o', options.outputDir);
  }
  if (options.force) {
    cmdArgs.push('-f');
  }

  const command = `"${scriptPath}" ${cmdArgs.map((arg) => `"${arg}"`).join(' ')}`;

  try {
    console.log('📄 Starting PDF to Markdown conversion...\n');
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    console.log('\n✅ Conversion complete!');
  } catch (error) {
    console.error('\n❌ Conversion failed');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
