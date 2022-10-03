local errorCodes = { notExist=3, alreadyExist=4, conditionNotMatch=5 }

local function debugClear()
    redis.pcall("del", "debug")
end

local function debug(msg)
    redis.pcall("RPUSH", "debug", msg)
end

local function success()
    local respond = {}
    respond["success"] = true
    return cjson.encode(respond)
end

local function error(errorCode, message)
    local respond = {}
    respond["errorCode"] = errorCode
    respond["message"] = message
    return cjson.encode(respond)
end

local function isEmpty(s)
    return s == nil or s == ""
end

local function isNotempty(s)
    return s ~= nil and s ~= ""
end

local function isInt(s)
    return s ~= nil and s == math.floor(s)
end

local function isNumeric(s)
    local v = tonumber(s);
    return v ~= nil and tostring(v) ~= "nan"
end

local function getEntityStorageKey(tableName, id)
    return "entity:" .. tableName .. ":" .. id
end

local function getIndexStorageKey(tableName, column)
    return "index:" .. tableName .. ":" .. column
end

-- function table.check(indexArr)
--     for i, val in pairs( indexArr ) do
--         logit(tostring(i) .. ": (" .. type(val) .. ") " .. val)
--     end
-- end
--
-- function table.hasKey(dict, key)
--     for _key, value in pairs(dict) do
--         if _key == key then
--             return true
--         end
--     end
--     return false
-- end
--
-- function table.hasValue(array, value)
--     for i, _value in ipairs(array) do
--         if _value == value then
--             return true
--         end
--     end
--     return false
-- end
--
-- function table.slice(arr, first, last)
--     local sliced = {}
--     for i = first or 1, last or #arr, 1 do
--         sliced[#sliced + 1] = arr[i]
--     end
--     return sliced
-- end
--
-- function table.values( tbl )
--     local arr = {}
--     for key, val in pairs( tbl ) do
--         arr[ #arr + 1 ] = val
--     end
--     return arr
-- end
--
local function table_flattern(dict)
    local tbl = {}
    for k, v in pairs(dict) do
        table.insert(tbl, k)
        table.insert(tbl, v)
    end
    return tbl
end
--
-- function table.keys( tbl )
--     local arr = {}
--     for key, val in pairs( tbl ) do
--         arr[ #arr + 1 ] = key
--     end
--     return arr
-- end
--
-- function table.toTable(arr)
--     local tbl = {}
--     for i, val in ipairs(arr) do
--         tbl[val] = 1
--     end
--     return tbl
-- end
--
-- function table.whereIndexIntersect(indexArr, tbls)
--     if #tbls < 1 then return indexArr end
--     local tblParis = ipairs(tbls)
--     for i, v in pairs(indexArr) do
--         for ii, _ in ipairs(tbls) do
--             if tbls[ii][v] == nil then
--                 indexArr[i] = nil
--             end
--         end
--     end
--     -- this indexArr will become non iterable table, convert it back to array
--     return table.values(indexArr)
-- end
