<template>
	<div id="ext-wikilambda-editor">
		<full-zobject :zobject="zobject"
			:persistent="true"
			@input="updateZobject"
		></full-zobject>
		<div>
			<label for="summary"> {{ $i18n( 'wikilambda-summarylabel' ) }} </label>
			<input v-model="summary"
				class="ext-wikilambda-zedit_summary"
				name="summary"
			>
		</div>
		<button @click="submit">
			{{ submitButtonLabel }}
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
			submitLabel, zid;

		if ( createNewPage ) {
			zid = mw.config.get( 'wgTitle' );
			zobject.Z2K1 = zid;

			submitLabel = mw.msg(
				mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ?
					'wikilambda-publishnew' : 'wikilambda-savenew'
			);
		} else {
			submitLabel = mw.msg(
				mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ?
					'wikilambda-publishchanges' : 'wikilambda-savechanges'
			);
		}

		return {
			zobject: zobject,
			submitButtonLabel: submitLabel,
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
