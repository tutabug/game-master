# PDF to Markdown Conversion

This project includes Python-based PDF to Markdown conversion using `marker-pdf`.

## Quick Start

Convert a PDF to Markdown:
```bash
pnpm convert-pdf documents/SRD_CC_v5.2.1.pdf
```

Output will be saved to `documents/markdown/SRD_CC_v5.2.1.md`

## Options

```bash
pnpm convert-pdf <pdf-file> [options]

Options:
  -o, --output-dir <dir>  Output directory (default: documents/markdown)
  -f, --force             Overwrite existing files

Examples:
  pnpm convert-pdf documents/manual.pdf
  pnpm convert-pdf documents/guide.pdf -o output/md
  pnpm convert-pdf documents/book.pdf --force
```

## How It Works

1. **First run**: Creates a Python virtual environment in `scripts/python/.venv/` and installs `marker-pdf`
2. **Conversion**: Uses marker-pdf's ML models to extract text with proper formatting
3. **Output**: Clean Markdown with preserved headers, lists, tables, and structure

## Architecture

- `scripts/python/requirements.txt` - Python dependencies
- `scripts/python/convert_pdf_to_markdown.py` - Python conversion script
- `scripts/convert-pdf.sh` - Shell wrapper (handles venv setup)
- `src/cli/convert-pdf.cli.ts` - NestJS CLI entry point

## Why marker-pdf?

- **High quality**: Uses ML models for layout detection
- **Structure preservation**: Maintains headers, lists, tables
- **Better than basic extraction**: Handles multi-column layouts, text flow
- **Markdown output**: Perfect for further processing and chunking

## Requirements

- Python 3.8+
- ~2GB disk space for models (downloaded on first run)
- Optional: CUDA-capable GPU for faster processing

## Notes

- Virtual environment and models are cached after first run
- Converted Markdown files are gitignored (`documents/markdown/`)
- Python dependencies are isolated from the Node.js project
