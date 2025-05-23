# retry-run-action

Simple retry script run action

## Usage

The number of attempts is provided as the RETRY_RUN_ATTEMPT environment variable during script execution.

```yaml
- uses: srz-zumix/retry-run-action@v0
  with:
    retry: 5
    run: |
      echo "count=${RETRY_RUN_ATTEMPT}" | tee -a "${GITHUB_OUTPUT}"
      test "${RETRY_RUN_ATTEMPT}" == 5
```

## Inputs

### `retry`

retry count. Default: `3`

### `run`

run script text. (require)

### `interval`

interval seconds. Default: `5`

### `shell`

custom shell command. Default: ``

see [GitHub Actions shell][]

## Outputs

Output to [GITHUB_OUTPUT][] is available.

[GITHUB_OUTPUT]: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-output-parameter
[GitHub Actions shell]: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsshell
