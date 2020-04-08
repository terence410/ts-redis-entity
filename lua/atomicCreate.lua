local id = ARGV[1]
local storageKey = ARGV[2]
local normalizedValues = cjson.decode(ARGV[3])
local expireSeconds = tonumber(ARGV[4])

local isExist = redis.call("exists", storageKey)
if isExist == 1 then
    return error(errorCodes.alreadyExist, "entity already exist for id: " ..  id .. ".")
end

redis.call("HMSET", storageKey, unpack(table.flattern(normalizedValues)))

if expireSeconds > 0 then
    redis.call("EXPIRE", storageKey, expireSeconds)
end

return success()
