import React from 'react';
import { ARMSStore } from '../../services/armsDataService';
import { User } from '../../types/arms';
import { CollectionModule } from './CollectionModule';

interface CommLogModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const CommLogModule: React.FC<CommLogModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  // Renders the unified Collection & CommLog hub defaulted to Communication Logs tab
  return (
    <CollectionModule
      store={store}
      currentUser={currentUser}
      onUpdateStore={onUpdateStore}
      initialTab="COMM_LOGS"
    />
  );
};
