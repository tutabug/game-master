#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_DIR="$SCRIPT_DIR/python"
VENV_DIR="$PYTHON_DIR/.venv"
REQUIREMENTS="$PYTHON_DIR/requirements.txt"
CONVERT_SCRIPT="$PYTHON_DIR/convert_pdf_to_markdown.py"

echo "🐍 Setting up Python environment for PDF conversion..."

if [ ! -d "$VENV_DIR" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
    echo "✅ Virtual environment created"
fi

echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

if ! pip show marker-pdf >/dev/null 2>&1; then
    echo "Installing marker-pdf dependencies..."
    pip install --upgrade pip
    pip install -r "$REQUIREMENTS"
    echo "✅ Dependencies installed"
else
    echo "✅ marker-pdf already installed"
fi

echo ""
echo "🔄 Converting PDF to Markdown..."
echo ""

python "$CONVERT_SCRIPT" "$@"

deactivate
