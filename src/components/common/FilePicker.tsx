import React from 'react';
import { Platform } from 'react-native';
import { Button } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';

interface FilePickerProps {
  onFileSelected: (file: { uri: string; name: string; type: string }) => void;
  label?: string;
}

/**
 * Native file picker using expo-document-picker
 */
export const FilePicker: React.FC<FilePickerProps> = ({
  onFileSelected,
  label = 'Import Book',
}) => {
  const handlePress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/epub+zip',
          'application/pdf',
          'application/x-mobipocket-ebook',
          'application/octet-stream',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        onFileSelected({
          uri: file.uri,
          name: file.name || 'unknown',
          type: file.mimeType || 'application/octet-stream',
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  return (
    <Button icon="plus" mode="contained" onPress={handlePress}>
      {label}
    </Button>
  );
};

export default FilePicker;
