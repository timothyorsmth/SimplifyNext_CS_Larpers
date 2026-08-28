# [PROJECT NAME PLEASE ENTER]: Preventing caregiver burnout with Agentic AI
---

Group: CS Larpers 
Group Members: Jay En, Jovi, Priyanka, Timothy, Yun Feng (NUS)

## Contents
---
1. Project Summary
2. Project Features
3. Dependencies
4. Setup Guide
5. Tech stach :P
6. Agent workflow 

## Project Summary
[INSERT PROJECT SUMMARY PLEASE]

## Project Features
- AI agents that help you manage and book follow up treatments, finding the best time in your calendar.
- AI agents that will create daily tasks that can be seen by everyone if they are done or not (i.e. medicine, food, travel). These prompts can be created based on user prompts.
- AI agents that use sentiment analysis to find relevant articles and schemes (financial and medical) for patients based on their history and conditions.
- AI agents that generates a report for new healthcare providers that can be regenerated to focus on certain timeframes/health issues.

## Prerequisites
- Node.js (v18+) and npm
- Python 3.11+
- AWS CLI, configured with credentials (`aws configure`)
- AWS SAM CLI (for deploying the Lambda backend)
- An AWS account with Bedrock model access enabled in your target region

## Setup Guide
1. Install Node.js and Python (from their respective websites)
2. create a virtual environment and install python dependencies 

``` bash
python -m venv .venv && source .venv/bin/activate 
pip install -r requirements.txt
```
(note if source doesn't work you can activate the virtual environment through VScode. google it.)

3. Configure AWS access keys :D

4. Run the backend

``` bash
uvicorn backend.main:app --reload
```

Visit http://127.0.0.1:8000/docs for interactive API docs

5. [On a separate terminal] Change the directory to the frontend, and then use vite to run the dev build:

```bash
cd frontend
npm run 
```

6. To kill the individual terminals, press ctrl + C :P

IMPORTANT: DO NOT COMMIT .ENV FILE. DO NOT. NO. NO.
