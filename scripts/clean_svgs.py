import os
import re

metadata_regex = re.compile(r'<metadata[\s\S]*?</metadata>', re.IGNORECASE)
c2pa_attr_regex = re.compile(r'\s*xmlns:c2pa="[^"]*"', re.IGNORECASE)

cleaned_count = 0
for root_dir in ['frontend/public', 'frontend/src']:
    for root, dirs, files in os.walk(root_dir):
        for f in files:
            if f.endswith('.svg'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                    content = fp.read()
                
                new_content = metadata_regex.sub('', content)
                new_content = c2pa_attr_regex.sub('', new_content)
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as fp:
                        fp.write(new_content)
                    cleaned_count += 1

print(f"Total SVG files cleaned: {cleaned_count}")
