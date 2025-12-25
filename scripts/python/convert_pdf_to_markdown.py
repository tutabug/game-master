#!/usr/bin/env python3
"""
Convert PDF files to Markdown using marker-pdf.
"""
import argparse
import sys
import os
from pathlib import Path

# Force CPU device (MPS on macOS has compatibility issues with marker)
os.environ["TORCH_DEVICE"] = "cpu"

from marker.converters.pdf import PdfConverter
from marker.models import create_model_dict


def convert_pdf(input_path: Path, output_dir: Path, force: bool = False) -> None:
    """
    Convert a single PDF file to Markdown.
    
    Args:
        input_path: Path to the PDF file
        output_dir: Directory where Markdown files will be saved
        force: If True, overwrite existing files
    """
    if not input_path.exists():
        print(f"Error: Input file does not exist: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    if not input_path.suffix.lower() == '.pdf':
        print(f"Error: Input file is not a PDF: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_filename = input_path.stem + '.md'
    output_path = output_dir / output_filename
    
    if output_path.exists() and not force:
        print(f"Output file already exists: {output_path}")
        print("Use --force to overwrite")
        sys.exit(1)
    
    print(f"Converting PDF: {input_path}")
    print(f"Output directory: {output_dir}")
    print("Note: Using CPU device (forced for compatibility)")
    print("Loading marker models...")
    
    try:
        converter = PdfConverter(
            artifact_dict=create_model_dict(),
        )
        
        print(f"Converting {input_path.name}...")
        rendered = converter(str(input_path))
        
        # Extract markdown text
        md_text = rendered.markdown
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(md_text)
        
        # Save images if any
        if rendered.images:
            image_dir = output_dir / f"{input_path.stem}_images"
            image_dir.mkdir(exist_ok=True)
            for img_name, img_data in rendered.images.items():
                img_path = image_dir / img_name
                with open(img_path, 'wb') as img_file:
                    img_file.write(img_data)
            print(f"   Images saved: {len(rendered.images)} files to {image_dir}")
        
        print(f"✅ Successfully converted to: {output_path}")
        print(f"   Output size: {len(md_text)} characters")
        print(f"   Lines: {len(md_text.splitlines())}")
        
        if rendered.metadata:
            toc = rendered.metadata.get('table_of_contents', [])
            if toc:
                print(f"   Table of contents: {len(toc)} sections")
        
    except Exception as e:
        print(f"❌ Error during conversion: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Convert PDF files to Markdown using marker-pdf"
    )
    parser.add_argument(
        "input",
        type=Path,
        help="Path to the PDF file to convert"
    )
    parser.add_argument(
        "-o", "--output-dir",
        type=Path,
        default=Path("documents/markdown"),
        help="Output directory for Markdown files (default: documents/markdown)"
    )
    parser.add_argument(
        "-f", "--force",
        action="store_true",
        help="Overwrite existing output files"
    )
    
    args = parser.parse_args()
    
    convert_pdf(args.input, args.output_dir, args.force)


if __name__ == "__main__":
    main()
