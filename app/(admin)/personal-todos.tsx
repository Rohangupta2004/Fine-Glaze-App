import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { usePersonalTodos, useCreatePersonalTodo, useTogglePersonalTodo } from '../../src/hooks/usePersonalTodos';
import { colors } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';

export default function PersonalTodosScreen() {
  const insets = useSafeAreaInsets(); const profile = useAuthStore(s => s.profile); const [title, setTitle] = useState('');
  const { data: todos = [] } = usePersonalTodos(profile?.id); const create = useCreatePersonalTodo(); const toggle = useTogglePersonalTodo();
  const add = async () => { if (profile?.id && title.trim()) { await create.mutateAsync({ profileId: profile.id, title }); setTitle(''); } };
  return <View style={[styles.page,{paddingTop:insets.top+spacing.lg}]}><Text style={styles.title}>My To-dos</Text><View style={styles.add}><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Add a personal to-do" /><TouchableOpacity onPress={add} style={styles.button}><Ionicons name="add" size={22} color={colors.white}/></TouchableOpacity></View><ScrollView>{todos.map((todo:any)=><TouchableOpacity key={todo.id} style={styles.row} onPress={()=>toggle.mutate({id:todo.id,completed:!todo.completed_at})}><Ionicons name={todo.completed_at?'checkbox':'square-outline'} size={22} color={todo.completed_at?colors.success:colors.primary}/><Text style={[styles.item,todo.completed_at&&styles.done]}>{todo.title}</Text></TouchableOpacity>)}</ScrollView></View>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:colors.background,paddingHorizontal:spacing.lg},title:{fontSize:24,fontWeight:'700',color:colors.ink,marginBottom:spacing.lg},add:{flexDirection:'row',gap:spacing.sm,marginBottom:spacing.lg},input:{flex:1,backgroundColor:colors.white,borderRadius:radius.md,padding:spacing.md,color:colors.ink},button:{backgroundColor:colors.primary,width:48,borderRadius:radius.md,alignItems:'center',justifyContent:'center'},row:{flexDirection:'row',gap:spacing.md,alignItems:'center',backgroundColor:colors.white,padding:spacing.md,borderRadius:radius.md,marginBottom:spacing.sm},item:{flex:1,color:colors.ink,fontSize:16},done:{textDecorationLine:'line-through',color:colors.neutral[400]}});