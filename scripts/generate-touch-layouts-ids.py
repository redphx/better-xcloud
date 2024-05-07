import os

FOLDER = 'touch-layouts'
OUTPUT_FILE = os.path.join(FOLDER, 'ids.json')

gameIds = list()

# Get files in folder
for file in os.listdir(FOLDER):
    if not file.endswith('.json') or file == 'ids.json':
        continue

    # Get game ID from file name (as int so we can sort the list later)
    gameId = int(file.replace('.json', ''))
    gameIds.append(gameId)

# Sort list of ints
gameIds.sort()
# Convert int to string
gameIds = list(map((lambda x: str(x)), gameIds))

# Generate output string
output = '[\n  ' + ',\n  '.join(gameIds) + '\n]\n'

# Write to file
with open(OUTPUT_FILE, 'w') as fp:
    fp.write(output)

print(output)
