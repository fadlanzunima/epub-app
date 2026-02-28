import React, { useRef, ChangeEvent } from 'react';
import { Platform } from 'react-native';
import { Button } from 'react-native-paper';

interface FilePickerProps {
  onFileSelected: (file: { uri: string; name: string; type: string }) => void;
  accept?: string;
  label?: string;
}

/**
 * Web-specific file picker using HTML input element
 */
export const FilePicker: React.FC<FilePickerProps> = ({
  onFileSelected,
  accept = '.epub,.pdf,.mobi,.azw,.azw3',
  label = 'Import Book',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create object URL for the file
      const uri = URL.createObjectURL(file);
      onFileSelected({
        uri,
        name: file.name,
        type: file.type,
      });
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <>
      <Button icon="plus" mode="contained" onPress={handleClick}>
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  );
};

export default FilePicker;
