<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div id="ext-wikilambda-app">
		<z-object-editor v-if="viewmode === false"
		></z-object-editor>
		<z-object-viewer v-if="viewmode === true"
		></z-object-viewer>
	</div>
</template>

<script>
var ZObjectEditor = require( './ZObjectEditor.vue' ),
	ZObjectViewer = require( './ZObjectViewer.vue' );

module.exports = {
	name: 'App',
	components: {
		'z-object-editor': ZObjectEditor,
		'z-object-viewer': ZObjectViewer
	},
	data: function () {
		return {
			viewmode: null
		};
	},
	created: function () {
		var editingData = mw.config.get( 'extWikilambdaEditingData' );
		this.viewmode = editingData.viewmode;
	}
};
</script>
