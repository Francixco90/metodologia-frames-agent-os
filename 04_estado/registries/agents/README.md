# Agent registry V2

`agent-registry-v2.yml` is the compact V2 migration layer for RT-01 through
RT-11. It materializes each role against one hash-bound base contract and keeps
an immutable hash binding to the existing V1 YAML.

The existing `agents/RT-*/contract.yml` files remain the VS-001 compatibility
surface. Producer cutover is explicitly blocked until adapters and contract
tests prove V1-to-V2 parity.

RT-01 (`CreativeOrchestratorV2`) and RT-11 (`GuardianV2`) are permanent.
RT-02 through RT-10 are instantiated only for bounded work units. The runtime
admits at most two active specialist instances, requires RT-09 before RT-11,
and forbids publication.
