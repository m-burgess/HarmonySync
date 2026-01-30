#!/bin/bash

OUTPUT_FILE="project_summary.md"
> $OUTPUT_FILE

echo "# Project Code Summary" >> $OUTPUT_FILE

find . -name "*.rs" -o -name "*.js" -o -name "*.jsx" | while read -r file; do
    echo "\n---\n### $file" >> $OUTPUT_FILE
    grep -E 'fn |struct |enum |impl |function |class |const ' "$file" >> $OUTPUT_FILE
done

echo "\nSummary complete in $OUTPUT_FILE"

