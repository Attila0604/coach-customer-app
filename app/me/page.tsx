table_name,column_name,data_type
checkins,id,uuid
checkins,customer_id,uuid
checkins,week_of,date
checkins,weight_kg,numeric
checkins,waist_cm,numeric
checkins,hip_cm,numeric
checkins,energy_rating,integer
checkins,sleep_rating,integer
checkins,mood_rating,integer
checkins,notes,text
checkins,created_at,timestamp with time zone
food_logs,id,uuid
food_logs,customer_id,uuid
food_logs,logged_at,timestamp with time zone
food_logs,meal_type,text
food_logs,raw_description,text
food_logs,parsed_items,jsonb
food_logs,total_kcal,integer
food_logs,protein_g,numeric
food_logs,carbs_g,numeric
food_logs,fat_g,numeric
