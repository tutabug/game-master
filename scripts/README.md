# Python Scripts

This directory contains isolated Python scripts for PDF processing.

## Structure

```
scripts/
├── convert-pdf.sh              # Shell wrapper (run from project root)
└── python/
    ├── requirements.txt        # Python dependencies
    ├── convert_pdf_to_markdown.py  # Conversion script
    └── .venv/                  # Python virtual environment (auto-created)
```

## Usage

**From project root:**
```bash
pnpm convert-pdf documents/file.pdf
```

**Direct Python usage (advanced):**
```bash
# Activate venv
source scripts/python/.venv/bin/activate

# Run conversion
python scripts/python/convert_pdf_to_markdown.py documents/file.pdf -o output/

# Deactivate
deactivate
```

## Setup

Virtual environment is created automatically on first run. To manually set up:

```bash
cd scripts/python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Dependencies

- `marker-pdf` - ML-based PDF to Markdown converter
