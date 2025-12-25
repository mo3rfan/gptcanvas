import React from 'react';

export const nodeToString = (node: React.ReactNode): string => {
    if (typeof node === 'string') {
        return node;
    }
    if (typeof node === 'number') {
        return node.toString();
    }
    if (node === null || typeof node === 'undefined') {
        return '';
    }
    if (Array.isArray(node)) {
        return node.map(nodeToString).join('');
    }
    if (React.isValidElement(node)) {
        const element = node as React.ReactElement<any>;
        if (element.props.children) {
            return React.Children.map(element.props.children, nodeToString)?.join('') || '';
        }
    }
    return '';
};
