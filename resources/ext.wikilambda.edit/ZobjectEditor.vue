<template>
	<!--
		WikiLambda Vue interface module for top-level editor encapsulation.

		@copyright 2020 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<!-- TODO: Add a loading indicator, once T254695 is done upstream. -->
	<div id="ext-wikilambda-editor">
		<full-zobject :zobject="zobject"
			:persistent="true"
			:viewmode="false"
			@input="updateZobject"
		></full-zobject>
		<div>
			<!-- TODO: Replace this with a full save dialog (copywarn, IPwarn, minor edit box, …)? -->
			<label for="summary"> {{ $i18n( 'wikilambda-summarylabel' ) }} </label>
			<input v-model="summary"
				class="ext-wikilambda-editSummary"
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
var Constants = require( './Constants.js' ),
	FullZobject = require( './FullZobject.vue' );

module.exports = {
	name: 'ZobjectEditor',
	data: function () {
		var editingData = mw.config.get( 'extWikilambdaEditingData' ),
			zobject = editingData.zobject,
			createNewPage = editingData.createNewPage,
			submitLabel;

		if ( createNewPage ) {
			zobject[ Constants.Z_PERSISTENTOBJECT_ID ] = editingData.title;

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
			var page = mw.config.get( 'extWikilambdaEditingData' ).page,
				api = new mw.Api(),
				self = this;
			if ( this.createNewPage ) {
				// TODO: If the page already exists, increment the counter until we get a free one.
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
.ext-wikilambda-editSummary {
	width: 100%;
}

.ext-wikilambda-editor-nojswarning {
	display: none;
}
</style>
