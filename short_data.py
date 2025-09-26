import pandas as pd

# Load dataset
df = pd.read_csv("Project_Code/data/dataset.csv")

# Filter rows where set_name = "Base Set"
filtered_df = df[df["set_name"] == "Base Set"]

# Save to new CSV
filtered_df.to_csv("Project_Code/data/short_dataset.csv", index=False)

print("short_dataset.csv created successfully!")