import pandas as pd

# Load dataset
df = pd.read_csv("Project_Code/data/dataset.csv")

# Filter rows where set_name = "Base Set"
filtered_df = df[df["set_name"] == "Base Set"]

# Divide all columns containing 'avg' in their name by 100
avg_columns = [col for col in filtered_df.columns if "avg" in col.lower()]
filtered_df[avg_columns] = filtered_df[avg_columns] / 100

# Save to new CSV
filtered_df.to_csv("Project_Code/data/short_dataset_prices_fixed.csv", index=False)

