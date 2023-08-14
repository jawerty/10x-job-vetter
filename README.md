# 10x job vetter
A glassdoor webscraper for fine tuning an LLM to detect if a workplace is toxic based on the job description

Live streamed here: https://www.youtube.com/watch?v=Yu-uzRBSKzw&t=17s

# The dataset
What the prompts look like
```
[JOB-VETTER-JOB-DESCRIPTION]
	
Description...

[JOB-VETTER-JOB-LABELS]

PROS: pro 1, pro 2, ...
CONS: con 1, con 2, ...
```

# How to scrape the dataset
Generate the dataset
```
$ node glassdoor-review-finder.js
```

# How to train
I had a lot of success fine-tuning LLama 2 w/ QLoRa on the projects colab here [https://colab.research.google.com/drive/1W2ymyQeIhNIRno40turn8U-mfW6iWd_u?usp=sharing](https://colab.research.google.com/drive/1W2ymyQeIhNIRno40turn8U-mfW6iWd_u?usp=sharing)
