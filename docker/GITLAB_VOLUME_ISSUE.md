# GitLab Bind-Mount Issue

## Issue

When this volume was added to `compose.yaml`:

```yaml
- ./gitlab/data:/var/opt/gitlab
```

GitLab appeared to stop during reconfigure at:

```text
storage_directory[/var/opt/gitlab/.ssh] action create
```

The bind-mounted `gitlab/data` directory was already populated and owned by the host user. GitLab runs some operations as its internal `git` user, which uses UID/GID `998` in the GitLab image. That user could not create or use `/var/opt/gitlab/.ssh` inside the mounted directory.

This was a bind-mount ownership/permission problem, not a problem with the volume syntax.

## Solution

The missing `.ssh` directory was created and assigned to GitLab's internal `git` user:

```bash
cd /home/shuaib-khan/Documents/Devops/docker
mkdir -p gitlab/data/.ssh

docker run --rm \\
  -v "$PWD/gitlab/data:/var/opt/gitlab" \\
  --entrypoint sh gitlab/gitlab-ce \\
  -c 'chown 998:998 /var/opt/gitlab/.ssh && chmod 700 /var/opt/gitlab/.ssh'

docker compose up -d
```

After this, GitLab progressed beyond the `.ssh` step and continued with database configuration.

## Verification

Watch the startup logs:

```bash
docker compose logs -f gitlab-server
```

Check the service:

```bash
docker compose ps
```

GitLab is available at:

```text
http://localhost:8000
```

## Note

The first GitLab startup with a persistent data directory can take several minutes while it runs database setup and reconfigure tasks. Do not remove `gitlab/data` unless you intentionally want to delete the GitLab data stored there.

## Docker Container Exit-Event Issue

### Symptom

Running `docker compose up -d` failed with:

```text
Error response from daemon: cannot stop container:
tried to kill container, but did not receive an exit event
```

Docker showed the existing `gitlab-server` container as running, but its host process had already exited. Compose created a replacement container but could not stop or remove the stale container record.

### Recovery

Restart the Docker daemon, then start the Compose stack again:

```bash
sudo systemctl restart docker
docker compose up -d
docker compose ps
```

This does not remove the GitLab bind-mounted data under `gitlab/`. GitLab may initially show `health: starting` while its internal services boot. Wait until it becomes `healthy` before using the web interface.

### GitLab Runner Configuration

The runner container can be running without being registered. If its logs contain:

```text
Failed to load config stat /etc/gitlab-runner/config.toml: no such file or directory
```

register it after GitLab is healthy:

```bash
docker exec -it gitlab-runner gitlab-runner register
```

Use `http://gitlab-server` as the GitLab URL because both services are on the Compose network. The registration command creates `gitlab-runner/config/config.toml`.
