You are helping rebuild a project from scratch.

Project: VSMatch

Context:
VSMatch is a football pickup platform where users compete on football courts ("коробки"), play matches, and receive ratings.

Current goal is NOT full product implementation but creation of a clean architectural foundation.

Important:
Delete (or ignore and replace) all existing project files except application.json containing secrets/configuration.

Rebuild project from scratch using clean three-layer architecture.

Tech stack:
- C#
- ASP.NET Core Web API
- LINQ
- REST
- PostgreSQL
- Docker
- React

Architecture principles (must follow):
- SOLID
- KISS
- Prefer simplicity over abstraction
- Avoid overengineering
- Use composition where possible
- Follow clean code practices

Backend architecture (strictly follow):

1. Controllers layer
- thin controllers
- request validation only
- no business logic

2. Business Logic layer (Services)
- domain logic here
- use interfaces
- dependency injection

3. Repository layer
- repository pattern for DAL access
- PostgreSQL persistence
- clean abstractions

Use clean folder structure.

Initial scope only two services:

1. Authentication service
Requirements:
- VK ID authorization only
- do not store unnecessary personal data
- use external identity through VK ID
- minimal auth flow scaffold is enough

2. Courts (Playgrounds) service

IMPORTANT:
Information about football courts already exists in:

moscow_sao_football_pitches.csv

Use this CSV as source data:
- design import/seed pipeline from CSV
- parse and load demo data into PostgreSQL
- use it for initial playground seed

Court model should include:
- name
- coordinates
- description
- rating placeholder

Support endpoints:
- list all courts
- get court by id

Backend requirements:
- docker-compose for api + postgres
- repository interfaces + implementations
- DTOs
- migrations
- seed using CSV data
- clean REST routes

Code quality constraints:
- One responsibility per class
- Keep services focused
- Keep repositories thin
- Avoid unnecessary patterns
- Do not introduce abstractions without clear need
- Prefer pragmatic .NET idioms

Frontend:
Create simple but visually polished React frontend prototype:
- map with football courts markers loaded from backend
- click marker -> show court description card
- demo/test UI only
- modern clean styling

Future-proof domain:
Scaffold so rating system can be added later, but do not implement it now.

Important:
Generate production-quality skeleton, not toy code.

Before coding:
1. Propose project structure
2. Explain how SOLID and KISS are applied
3. Generate backend scaffold
4. Generate frontend scaffold
5. Explain architectural decisions
Prefer LINQ over manual SQL unless performance-critical.
Use EF Core unless explicit raw SQL is justified.