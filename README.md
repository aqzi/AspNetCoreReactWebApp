# AspNetCore-React-WebApp (.net 7)
This project provides an improvement for the .net react template with authentication.
Most javascript files are replaced with typescript files. 
The sql database from the original template is replaced with a postgres database.
I added a docker-compose to easily configure the database.
This project also includes tailwind but currently it's not used. Adding tailwind styles to html elements should work instantly.
Finally I also changed the project structure, which is better suited for large projects.

## setup:
1. Running the code:
    1. Go inside AspNetCoreReactWebApp.Web/ClientApp
    2. run command: `npm install` (only once)

2. Docker:
    1. Change the docker-compose to your needs!
    2. afterwards run command: `docker compose up`

3. Adding migrations:
    1. Go into AspNetCoreReactWebApp.Data
    2. run command: `dotnet ef migrations add Initial -s ../AspNetCoreReactWebApp.Web/`

4. Renaming project (optional and be careful with this):
If you want to rename the project you must rename following things: root folder, sln file, project folders, projects inside the sln file, csproj file name and the project references it includes (do this in each project folder), usings and namespaces. When finished remove all bin and obj folder if they exist already.

## Executing the code
1. Go inside AspNetCoreReactWebApp.Web
2. run command: `dotnet run`
