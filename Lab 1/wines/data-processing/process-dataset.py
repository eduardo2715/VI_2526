import pandas as pd            
import re                      # For regular expression operations (used to extract years)
import numpy as np             # For handling numerical operations and NaN values

# Suppress SettingWithCopyWarning from pandas when modifying dataframes
pd.options.mode.chained_assignment = None

# Increase maximum number of rows displayed when printing a DataFrame
pd.options.display.max_rows = 9999

# ---------------------------------------------------------------------
# Step 1: Import dataset from CSV file into a DataFrame
df = pd.read_csv('./src/winemag-data-130k-v2.csv')

# ---------------------------------------------------------------------
# Step 2: Remove rows with any missing values (NaNs)
def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    return df.dropna()

# ---------------------------------------------------------------------
# Step 3: Drop columns that won't be used in the analysis
def remove_features(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop(["description", "designation", "taster_name", "taster_twitter_handle", "region_1", "region_2"], axis=1)

# ---------------------------------------------------------------------
# Step 4: Extract year from the wine title using a regular expression
def extract_year(title):
    # Match a 4-digit number (e.g., 2015) anywhere in the title
    year_match = re.search(r'\b\d{4}\b', title)
    if year_match:
        # If a year is found, convert it to integer
        return int(year_match.group())
    else:
        # If no year is found, return NaN
        return np.nan

# ---------------------------------------------------------------------
# Step 5: Add a new column called 'year' to the DataFrame
def create_features(df: pd.DataFrame) -> pd.DataFrame:
    return df.assign(
        year=lambda x: x['title'].apply(extract_year)  # Apply year extraction
                             .apply(lambda y: int(y) if not pd.isna(y) else 0)  # Replace NaNs with 0
    )

# ---------------------------------------------------------------------
# Step 6: Filter the DataFrame
def filter_dataset(df: pd.DataFrame) -> pd.DataFrame:
    return df[(df['year'] >= 2010) & (df['country'] == 'Portugal')]

# ---------------------------------------------------------------------
# Step 7: Randomly sample 350 rows for analysis/demo
# - random_state ensures reproducibility
def sample_dataset(df: pd.DataFrame) -> pd.DataFrame:
    return df.sample(n=350, random_state=42)

# ---------------------------------------------------------------------
# Step 8: Final clean-up step
def final_touches(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop(["country"], axis=1)

# ---------------------------------------------------------------------
# Step 9: Full preprocessing pipeline
def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    return (
        df
        .pipe(remove_features)   # Step 3
        .pipe(clean_dataset)     # Step 2
        .pipe(create_features)   # Step 5
        .pipe(filter_dataset)    # Step 6
        .pipe(sample_dataset)    # Step 7
        .pipe(final_touches)     # Step 8
    )

# Run the preprocessing on the dataset
df = preprocess_data(df)

# ---------------------------------------------------------------------
# Step 10: Save final DataFrame to CSV and JSON
df.to_csv('./export/dataset.csv', index=False)                      # Save as CSV without row indices
df.to_json('../data/dataset.json', index=False, orient="records")  # Save as JSON, with each row as a record
