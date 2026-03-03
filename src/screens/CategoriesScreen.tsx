import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Text,
  FAB,
  Portal,
  Dialog,
  TextInput,
  Button,
  useTheme,
  IconButton,
  Card,
  Chip,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import { useStore } from '../hooks/useStore';
import BookService from '../services/BookService';
import { Category } from '../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

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
  '#FF6D00',
  '#C51162',
  '#0091EA',
  '#64DD17',
  '#FFAB00',
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CategoryWithCount extends Category {
  bookCount: number;
}

export default function CategoriesScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { categories, setCategories } = useStore();
  const [categoriesWithCount, setCategoriesWithCount] = useState<
    CategoryWithCount[]
  >([]);
  const [visible, setVisible] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );

  const loadCategories = useCallback(async () => {
    const cats = await BookService.getCategories();
    setCategories(cats);

    // Load book counts for each category
    const catsWithCount = await Promise.all(
      cats.map(async cat => {
        const books = await BookService.getBooksByCategory(cat.id);
        return { ...cat, bookCount: books.length };
      }),
    );
    setCategoriesWithCount(catsWithCount);
  }, [setCategories]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories]),
  );

  const handleCreateCategory = async () => {
    if (categoryName.trim()) {
      await BookService.createCategory(categoryName.trim(), selectedColor);
      setCategoryName('');
      setSelectedColor(COLORS[0]);
      setVisible(false);
      loadCategories();
    }
  };

  const showDeleteConfirm = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteConfirmVisible(true);
  };

  const handleDeleteCategory = async () => {
    if (categoryToDelete) {
      await BookService.deleteCategory(categoryToDelete.id);
      setDeleteConfirmVisible(false);
      setCategoryToDelete(null);
      loadCategories();
    }
  };

  const renderCategory = ({ item }: { item: CategoryWithCount }) => (
    <Card
      style={[styles.categoryCard, { backgroundColor: theme.colors.surface }]}
      elevation={2}
    >
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() =>
          navigation.navigate('CategoryDetail', { category: item })
        }
        activeOpacity={0.8}
      >
        {/* Color accent bar */}
        <View style={[styles.colorAccent, { backgroundColor: item.color }]} />

        <View style={styles.cardInner}>
          {/* Icon container */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: item.color + '20' },
            ]}
          >
            <IconButton
              icon="folder-open"
              size={28}
              iconColor={item.color}
              style={styles.categoryIcon}
            />
          </View>

          {/* Category name */}
          <Text
            style={[styles.categoryName, { color: theme.colors.onSurface }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>

          {/* Book count chip */}
          <Chip
            style={[
              styles.bookCountChip,
              { backgroundColor: item.color + '15' },
            ]}
            textStyle={{ color: item.color, fontSize: 12 }}
          >
            {item.bookCount} {item.bookCount === 1 ? 'book' : 'books'}
          </Chip>
        </View>

        {/* Delete button */}
        <IconButton
          icon="close"
          size={18}
          iconColor={theme.colors.onSurfaceVariant}
          style={styles.deleteButton}
          onPress={() => showDeleteConfirm(item)}
        />
      </TouchableOpacity>
    </Card>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[styles.headerTitle, { color: theme.colors.onBackground }]}
        >
          Categories
        </Text>
        <Text
          style={[
            styles.headerSubtitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {categories.length}{' '}
          {categories.length === 1 ? 'category' : 'categories'}
        </Text>
      </View>

      <FlatList
        data={categoriesWithCount}
        keyExtractor={item => item.id}
        renderItem={renderCategory}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconButton
              icon="folder-outline"
              size={64}
              iconColor={theme.colors.onSurfaceDisabled}
            />
            <Text
              style={[
                styles.emptyStateTitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              No categories yet
            </Text>
            <Text
              style={[
                styles.emptyStateSubtitle,
                { color: theme.colors.onSurfaceDisabled },
              ]}
            >
              Create categories to organize your books
            </Text>
          </View>
        }
      />

      {/* Create Category Dialog */}
      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>Create New Category</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Category Name"
              value={categoryName}
              onChangeText={setCategoryName}
              mode="outlined"
              autoFocus
              style={styles.nameInput}
            />
            <Text
              style={[
                styles.colorLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Choose a color
            </Text>
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
                >
                  {selectedColor === color && (
                    <IconButton
                      icon="check"
                      size={20}
                      iconColor="#FFF"
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button
              onPress={handleCreateCategory}
              disabled={!categoryName.trim()}
              mode="contained"
            >
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={deleteConfirmVisible}
          onDismiss={() => setDeleteConfirmVisible(false)}
        >
          <Dialog.Title>Delete Category?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to delete "{categoryToDelete?.name}"? Books
              in this category will not be deleted.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteConfirmVisible(false)}>
              Cancel
            </Button>
            <Button
              onPress={handleDeleteCategory}
              textColor={theme.colors.error}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        label="Make category"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setVisible(true)}
        color="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: CARD_WIDTH,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    height: 140,
  },
  colorAccent: {
    width: 6,
  },
  cardInner: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  categoryIcon: {
    margin: 0,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  bookCountChip: {
    alignSelf: 'flex-start',
    height: 28,
  },
  deleteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    margin: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  nameInput: {
    marginBottom: 8,
  },
  colorLabel: {
    fontSize: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#000',
  },
  checkIcon: {
    margin: 0,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
