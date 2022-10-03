local id = ARGV[1]
local storageKey = ARGV[2]
local normalizedValues = cjson.decode(ARGV[3])
local expireSeconds = tonumber(ARGV[4])
local conditionNormalizedValues = cjson.decode(ARGV[5])

local isExist = redis.call("exists", storageKey)
if isExist ~= 1 then
    return error(errorCodes.notExist, "entity not exist for id: " ..  id .. ".")
end

-- process conditions
for column, normalizedValue in pairs(conditionNormalizedValues) do
    -- make sure it's not unique key
    local currentNormalizedValue = redis.call("HGET", storageKey, column)
    if currentNormalizedValue == false then
        return error(errorCodes.conditionNotMatch,
                "updateIf condition not match for column: " .. column .. ", id: " ..  id .. ". condition value: " .. string.sub(normalizedValue, 3) .. ", current value not exist.");
    elseif currentNormalizedValue ~= normalizedValue then
        return error(errorCodes.conditionNotMatch,
                "updateIf condition not match for column: " .. column .. ", id: " ..  id .. ". condition value: " .. string.sub(normalizedValue, 3) .. ", current value: " .. string.sub(currentNormalizedValue, 3) .. ".");
    end
end

redis.call("HMSET", storageKey, unpack(table_flattern(normalizedValues)))

if expireSeconds > 0 then
    redis.call("EXPIRE", storageKey, expireSeconds)
end

return success()
