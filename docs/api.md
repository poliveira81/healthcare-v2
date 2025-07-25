# MCP Server API Documentation

## POST /mentor/generate
Generate an OutSystems app using Mentor.

### Request Body
```
{
  "appSpec": { /* specification for the app */ }
}
```

### Response
```
{
  "result": { /* generated app details */ }
}
```
