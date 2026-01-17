## Usage
[Docker Hub](https://hub.docker.com/r/champpg/autoremove-torrents)

Credit: [dantebarba](https://github.com/dantebarba/docker-autoremove-torrents) - Original creator

### Web UI

A built-in Web UI on port **8080** lets you edit `config.yml`, run a **Preview** (`--view`), or **Run now**. When using a bind mount for `config.yml`, changes you save in the UI are persisted on the host.

| Variable      | Default | Description                    |
|---------------|---------|--------------------------------|
| `WEBUI_PORT`  | `8080`  | Port for the Web UI.           |
| `WEBUI_HOST`  | `0.0.0.0` | Host to bind the Web UI to.  |

### Docker
```
docker run -p 8080:8080 -v /path/to/config.yml:/app/config.yml -e OPTS='-c /app/config.yml' champpg/autoremove-torrents:latest
```
Open http://localhost:8080 for the Web UI.

### Docker Compose
```
services:
  autoremove:
    image: champpg/autoremove-torrents:latest
    container_name: autoremove-torrents
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /path/to/config.yml:/app/config.yml
    environment:
      - OPTS=-c /app/config.yml
```
Open http://localhost:8080 for the Web UI.
### Config.yml
```
my_task:
    client: qbittorrent
    host: http://127.0.0.1
    username: admin
    password: adminadmin
    strategies:
    my_strategy:
        categories: IPT
        remove: seeding_time > 1209600 or ratio > 1
    delete_data: true
```
OPTS can take the following arguments:

<table border="1" class="docutils">
<colgroup>
<col width="33%">
<col width="33%">
<col width="33%">
</colgroup>
<thead valign="bottom">
<tr class="row-odd"><th class="head">Arugments</th>
<th class="head">Argument Abbreviations</th>
<th class="head">Description</th>
</tr>
</thead>
<tbody valign="top">
<tr class="row-even"><td><cite>–view</cite></td>
<td><cite>-v</cite></td>
<td>Run and see which torrents will be removed, but don’t really remove them.</td>
</tr>
<tr class="row-odd"><td><cite>–conf</cite></td>
<td><cite>-c</cite></td>
<td>Specify the path of the configuration file.</td>
</tr>
<tr class="row-even"><td><cite>–task</cite></td>
<td><cite>-t</cite></td>
<td>Run a specific task only. The argument value is the task name.</td>
</tr>
<tr class="row-odd"><td><cite>–log</cite></td>
<td><cite>-l</cite></td>
<td>Sepcify the path of the log file.</td>
</tr>
</tbody>
</table>
