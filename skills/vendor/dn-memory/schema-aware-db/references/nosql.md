# NoSQL schema discovery

NoSQL schemas are **implicit** — enforced by application code, not the engine (mostly). So you learn the real shape by sampling real data and reading whatever validators/indexes exist. For key-value and wide-column stores, the **keys and access patterns are the schema** and must be known before you write anything.

## Step 1: Identify the engine and connection

MongoDB (`MONGO_URI`, mongoose models), DynamoDB (AWS SDK client, table name + region), Redis (`REDIS_URL`, key patterns), Cassandra, etc. Check `.env`, SDK client init, and ORM/ODM config.

## MongoDB

Sample real documents — do not trust one mongoose schema file, since documents in the same collection can vary.
```js
db.collection.findOne()                          // real field shape
db.collection.find().limit(5)                    // catch shape variation
db.collection.aggregate([{$sample:{size:20}},
  {$project:{fields:{$objectToArray:"$$ROOT"}}}]) // field frequency
db.collection.getIndexes()                        // indexes = your query plan
db.getCollectionInfos({name:"collection"})        // $jsonSchema validator, if any
```
Read the mongoose/ODM schema too, but reconcile it against sampled documents. Note: embedded documents vs. references (`ObjectId`) — joining via `$lookup` only works if you know which it is.

## DynamoDB

The **partition key (PK), sort key (SK), and Global/Local Secondary Indexes ARE the schema.** You cannot write correct access code without them — DynamoDB has no ad-hoc joins and queries must go through a key or index.
```
aws dynamodb describe-table --table-name T     # keys, GSIs, LSIs, projections
aws dynamodb scan --table-name T --max-items 5 # sample item shapes (costs RCU)
```
Before writing: identify the access pattern (get by PK? query by GSI?) and confirm a matching index exists. If the query you need has no supporting key/index, that's a design gap — flag it, don't `Scan` the whole table as a workaround.

## Redis

There is no schema — only key conventions. Learn them:
```
SCAN 0 MATCH prefix:* COUNT 100     # discover key patterns (never KEYS * in prod)
TYPE key                            # string/hash/list/set/zset/stream
TTL key                             # is it meant to expire?
```
Match the existing key-naming convention exactly; a typo'd prefix is a silent cache miss.

## Step 2: Record the facts

Exact field names and casing, which fields are embedded vs referenced, key/index structure, validators, and TTL/expiry expectations. Reference these verbatim when writing access code.

## Designing NoSQL to standard

You design around **access patterns**, not normalization. Model the data the way it's read: embed when read together, reference when independently large or shared, and create the indexes/GSIs the queries need up front. For DynamoDB, single-table design with well-chosen PK/SK is the industry norm — but only introduce it if the codebase already uses it; otherwise match the existing table layout.
