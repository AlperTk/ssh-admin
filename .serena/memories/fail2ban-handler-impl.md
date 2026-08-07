fail2ban-client write handler logic:
- Read-only subcommands: status, status --full, gettag
- Write subcommands: set, reload, reconfigure, start, stop, restart, ping, help, version, etc.
- Pattern: fail2ban-client <subcommand> [args]
- If subcommand is 'status' → read-only (false)
- Otherwise → write (true)