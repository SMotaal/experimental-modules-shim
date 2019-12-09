//@ts-check

/// Nodes

declare module '@smotaal/experimental-modules-shim/nodes' {
	export type Node = import('./nodes').Node;
	export type RootNode = import('./nodes').RootNode;
	export type ConstructNode = import('./nodes').ConstructNode;
	export type ClosureNode = import('./nodes').ClosureNode;
	export type TemplateNode = import('./nodes').TemplateNode;
	export type TextNode = import('./nodes').TextNode;
	export type TokenNode = import('./nodes').TokenNode;
}

type Node = import('@smotaal/experimental-modules-shim/nodes').Node;
type RootNode = import('@smotaal/experimental-modules-shim/nodes').RootNode;
type ConstructNode = import('@smotaal/experimental-modules-shim/nodes').ConstructNode;
type ClosureNode = import('@smotaal/experimental-modules-shim/nodes').ClosureNode;
type TemplateNode = import('@smotaal/experimental-modules-shim/nodes').TemplateNode;
type TextNode = import('@smotaal/experimental-modules-shim/nodes').TextNode;
type TokenNode = import('@smotaal/experimental-modules-shim/nodes').TokenNode;
