<template>
	<div id="ext-wikilambda-editor">
		<full-zobject :zobject="zobject"
			:persistent="true"
			@input="updateZobject"
		></full-zobject>
		<div>
			<label for="summary">Summary:</label>
			<input v-model="summary"
				class="ext-wikilambda-zedit_summary"
				name="summary"
			>
		</div>
		<button @click="submit">
			Save changes
		</button>
		<p>Current ZObject: {{ zobject }} </p>
	</div>
</template>

<script>
var FullZobject = require( './FullZobject.vue' );

module.exports = {
	name: 'ZobjectEditor',
	data: function () {
		var editingData = mw.config.get( 'extWikilambdaEditingData' ),
			zobject = editingData.zobject,
			createNewPage = editingData.createNewPage,
			zid;
		if ( createNewPage ) {
			zid = mw.config.get( 'wgTitle' );
			zobject.Z2K1 = zid;
		}
		return {
			zobject: zobject,
			createNewPage: createNewPage,
			summary: ''
		};
	},
	components: {
		'full-zobject': FullZobject
	},
	methods: {
		updateZobject: function ( newZobject ) {
			this.zobject = newZobject;
		},
		submit: function () {
			var page = mw.config.get( 'wgPageName' ),
				api = new mw.Api(),
				self = this;
			if ( this.createNewPage ) {
				api.create( page, { summary: self.summary },
					JSON.stringify( self.zobject )
				).then( function () {
					window.location.href = new mw.Title( page ).getUrl();
				} );
			} else {
				api.edit( page, function ( /* revision */ ) {
					return {
						text: JSON.stringify( self.zobject ),
						summary: self.summary
					};
				} ).then( function () {
					window.location.href = new mw.Title( page ).getUrl();
				} );
			}
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zedit_summary {
	width: 100%;
}
</style>
