const { supabase } = require('./supabase-config');

class DataService {
  constructor() {
    this.subscriptions = new Map();
  }

  // ========== 分组操作 ==========

  // 加载所有分组（按 sort_order 排序）
  async loadGroups() {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Failed to load groups:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // 创建分组
  async createGroup(name = '', theme = 'default') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用户未登录');

      // 获取当前最大 sort_order
      const { data: groups } = await supabase
        .from('groups')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxSortOrder = groups && groups.length > 0 ? groups[0].sort_order : -1;

      const { data, error } = await supabase
        .from('groups')
        .insert([{
          user_id: user.id,
          name,
          theme,
          sort_order: maxSortOrder + 1
        }])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Failed to create group:', error);
      return { success: false, error: error.message };
    }
  }

  // 更新分组
  async updateGroup(id, updates) {
    try {
      const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Failed to update group:', error);
      return { success: false, error: error.message };
    }
  }

  // 删除分组（级联删除待办）
  async deleteGroup(id) {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Failed to delete group:', error);
      return { success: false, error: error.message };
    }
  }

  // 重新排序分组
  async reorderGroups(groupIds) {
    try {
      const updates = groupIds.map((id, index) => ({
        id,
        sort_order: index
      }));

      const { error } = await supabase
        .from('groups')
        .upsert(updates.map(u => ({ id: u.id, sort_order: u.sort_order })));
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Failed to reorder groups:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== 待办操作 ==========

  // 加载分组下的所有待办（按 sort_order 排序）
  async loadTodos(groupId) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('group_id', groupId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Failed to load todos:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // 创建待办
  async createTodo(groupId, text) {
    try {
      // 获取当前最大 sort_order
      const { data: todos } = await supabase
        .from('todos')
        .select('sort_order')
        .eq('group_id', groupId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxSortOrder = todos && todos.length > 0 ? todos[0].sort_order : -1;

      const { data, error } = await supabase
        .from('todos')
        .insert([{
          group_id: groupId,
          text,
          completed: false,
          sort_order: maxSortOrder + 1
        }])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Failed to create todo:', error);
      return { success: false, error: error.message };
    }
  }

  // 更新待办
  async updateTodo(id, updates) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Failed to update todo:', error);
      return { success: false, error: error.message };
    }
  }

  // 删除待办
  async deleteTodo(id) {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Failed to delete todo:', error);
      return { success: false, error: error.message };
    }
  }

  // 批量删除待办
  async deleteTodos(ids) {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Failed to delete todos in batch:', error);
      return { success: false, error: error.message };
    }
  }

  // 重新排序待办
  async reorderTodos(groupId, todoIds) {
    try {
      const updates = todoIds.map((id, index) => ({
        id,
        sort_order: index
      }));

      const { error } = await supabase
        .from('todos')
        .upsert(updates.map(u => ({ id: u.id, sort_order: u.sort_order })));
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Failed to reorder todos:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== 实时订阅 ==========

  // 订阅分组变化
  subscribeToGroups(callback) {
    const channel = supabase
      .channel('groups-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'groups' },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    this.subscriptions.set('groups', channel);
    return channel;
  }

  // 订阅待办变化
  subscribeToTodos(groupId, callback) {
    const channelName = `todos-${groupId}`;
    
    // 取消之前的订阅
    if (this.subscriptions.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'todos',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return channel;
  }

  // 取消订阅
  unsubscribe(channelName) {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
    }
  }

  // 取消所有订阅
  unsubscribeAll() {
    this.subscriptions.forEach((channel, name) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
  }
}

module.exports = new DataService();

