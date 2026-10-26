# Compare service ownership correction

A saved Plan can retain creator A and a selected service ID while that service's current owner changes to provider B. The previous comparison checked only the current catalogue owner against each comparison column. It could consequently show B's new price against requirements still bound to A.

The regression reproduced Ksh 500 as a listed subtotal for B. The correction requires current service ownership to match the Plan's selected creator as well as the comparison provider whenever the Plan has a creator. Both columns now show Not provided and Matching services unconfirmed for that stale selection. It does not invent a replacement service, infer equivalence from a name or rewrite the saved Plan.

The focused five-test suite passes after failing before the correction. A real PostgreSQL regression saves the Plan, changes the service's workspace/provider and price through the disposable owner, restores through the actual repository, and verifies both providers remain unconfirmed. Deactivating the service also withholds its price. The saved revision remains unchanged by those reads. All 19 PostgreSQL checks pass with zero skips.

This remains experimental Compare work on the isolated Sprint 4 branch. It is excluded from the stable Build 1 release candidate. Browser/mobile readability evidence is reported separately and does not prove live provider offers or appointment availability.
