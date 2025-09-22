import pandas as pd

# Load your dataset
df = pd.read_csv("Test_code/data/dataset.csv")

# Get all unique types
unique_types = df['set_name'].unique()

# Print them
print("All available types:")
for t in unique_types:
    print(t)
