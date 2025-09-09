import pandas as pd            
import re                      # For regular expression operations (used to extract years)
import numpy as np             # For handling numerical operations and NaN values

# Suppress SettingWithCopyWarning from pandas when modifying dataframes
pd.options.mode.chained_assignment = None

# Increase maximum number of rows displayed when printing a DataFrame
pd.options.display.max_rows = 9999