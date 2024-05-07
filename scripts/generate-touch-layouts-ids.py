import json
import os

FOLDER = 'touch-layouts'
OUTPUT_FILE = os.path.join(FOLDER, 'ids.json')

product_ids = list()

# Get files in folder
for file in os.listdir(FOLDER):
    if not file.endswith('.json') or file == 'ids.json':
        continue

    with open(os.path.join(FOLDER, file)) as fp:
        content = json.load(fp)
        product_ids.append(content['product_id'])

# Sort list
product_ids.sort()

# Write to file
output = json.dumps(product_ids, separators=(',', ': '), indent=2) + '\n'
with open(OUTPUT_FILE, 'w') as fp:
    fp.write(output)

print(output)
