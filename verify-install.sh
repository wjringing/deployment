#!/bin/bash

# Verification script for install-ubuntu.sh

echo "========================================"
echo "Install Script Verification"
echo "========================================"
echo ""

# Check if install script exists
if [ ! -f "install-ubuntu.sh" ]; then
    echo "❌ ERROR: install-ubuntu.sh not found in current directory"
    echo ""
    echo "Please ensure you are in the correct directory:"
    echo "  cd /path/to/project"
    exit 1
fi

echo "✅ install-ubuntu.sh found"

# Check if it's a bash script
FILE_TYPE=$(file install-ubuntu.sh)
echo "File type: $FILE_TYPE"

if [[ ! "$FILE_TYPE" =~ "shell script" ]] && [[ ! "$FILE_TYPE" =~ "ASCII text" ]]; then
    echo "❌ ERROR: install-ubuntu.sh is not a valid bash script"
    echo ""
    echo "The file appears to be: $FILE_TYPE"
    echo ""
    echo "Please re-download or re-upload the file."
    exit 1
fi

echo "✅ File type is correct"

# Check syntax
echo ""
echo "Checking bash syntax..."
if bash -n install-ubuntu.sh 2>&1; then
    echo "✅ Bash syntax is valid"
else
    echo "❌ ERROR: Bash syntax errors found"
    exit 1
fi

# Check for HTML content (common corruption)
if grep -q "<!DOCTYPE" install-ubuntu.sh 2>/dev/null; then
    echo "❌ ERROR: File contains HTML content - it has been corrupted"
    echo ""
    echo "Please re-download the install-ubuntu.sh file."
    exit 1
fi

echo "✅ No HTML corruption detected"

# Check first line is shebang
FIRST_LINE=$(head -1 install-ubuntu.sh)
if [ "$FIRST_LINE" != "#!/bin/bash" ]; then
    echo "⚠️  WARNING: First line should be '#!/bin/bash'"
    echo "   Found: $FIRST_LINE"
else
    echo "✅ Shebang is correct"
fi

# Check if executable
if [ -x "install-ubuntu.sh" ]; then
    echo "✅ File is executable"
else
    echo "⚠️  File is not executable"
    echo "   Run: chmod +x install-ubuntu.sh"
fi

# Check size
SIZE=$(wc -l < install-ubuntu.sh)
if [ "$SIZE" -lt 100 ]; then
    echo "❌ WARNING: File is only $SIZE lines (should be ~852 lines)"
    echo "   File may be incomplete or corrupted"
else
    echo "✅ File size looks correct ($SIZE lines)"
fi

echo ""
echo "========================================"
echo "Verification Summary"
echo "========================================"
echo ""

# Count checks
ERRORS=$(grep -c "❌" /tmp/verify-results.txt 2>/dev/null || echo "0")

if bash -n install-ubuntu.sh 2>&1 >/dev/null && [ "$SIZE" -gt 100 ] && [ "$FIRST_LINE" = "#!/bin/bash" ]; then
    echo "✅ All checks passed!"
    echo ""
    echo "You can now run the installer:"
    echo "  chmod +x install-ubuntu.sh"
    echo "  sudo bash install-ubuntu.sh"
else
    echo "⚠️  Some issues detected. Please review above."
    echo ""
    echo "If the file is corrupted, please re-download it."
fi

echo ""
