import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import {
  Text,
  FAB,
  Portal,
  Dialog,
  TextInput,
  Button,
  useTheme,
  IconButton,
} from 'react-native-paper';

import { useStore } from '../hooks/useStore';
import BookService from '../services/BookService';
import { Category } from '../types';

const COLORS = [
  '#6200EE',
  '#03DAC6',
  '#FF0266',
  '#FFDE03',
  '#00C853',
  '#FF3D00',
  '#2962FF',
  '#AA00FF',
  '#00BFA5',
  '#FFD600',
];

export default function CategoriesScreen() {
  const theme = useTheme();
  const { categories, setCategories } = useStore();
  const [visible, setVisible] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const cats = await BookService.getCategories();
    setCategories(cats);
  };

  const handleCreateCategory = async () => {
    if (categoryName.trim()) {
      await BookService.createCategory(categoryName.trim(), selectedColor);
      setCategoryName('');
      setVisible(false);
      loadCategories();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    await BookService.deleteCategory(id);
    loadCategories();
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: theme.colors.surface }]}
    >
      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
      <Text style={styles.categoryName}>{item.name}</Text>
      <IconButton
        icon="delete"
        size={20}
        onPress={() => handleDeleteCategory(item.id)}
      />
    </TouchableOpacity>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        data={categories}
        keyExtractor={item => item.id}
        renderItem={renderCategory}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No categories yet
            </Text>
          </View>
        }
      />

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>Create Category</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Category Name"
              value={categoryName}
              onChangeText={setCategoryName}
              mode="outlined"
            />
            <View style={styles.colorPicker}>
              {COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColor,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateCategory}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setVisible(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  categoryName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 4,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#000',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 64,
  },
});
