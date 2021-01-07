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
	FullZobject = require( './FullZobject.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapMutations = require( 'vuex' ).mapMutations;

module.exports = {
	name: 'ZobjectEditor',
	components: {
		'full-zobject': FullZobject
	},
	data: function () {
		return {
			zobject: {},
			createNewPage: true,
			summary: ''
		};
	},
	computed: {
		submitButtonLabel: function () {
			if ( this.createNewPage ) {
				return mw.msg(
					mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ?
						'wikilambda-publishnew' : 'wikilambda-savenew'
				);
			} else {
				return mw.msg(
					mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ?
						'wikilambda-publishchanges' : 'wikilambda-savechanges'
				);
			}
		}
	},
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys' ] ),
		mapMutations( [ 'addZKeyLabel', 'setZLangs' ] ),
		{
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
	),

	created: function () {
		var editingData = mw.config.get( 'extWikilambdaEditingData' ),
			languageChain;
		this.createNewPage = editingData.createNewPage;

		// Set zobject
		this.zobject = editingData.zobject;
		if ( this.createNewPage ) {
			this.zobject[ Constants.Z_PERSISTENTOBJECT_ID ] = editingData.title;
		}

		// Set user language
		languageChain = mw.language.getFallbackLanguageChain();
		this.setZLangs( languageChain );

		// Fetch Z1 labels to initialize ZObject
		// We can assume that this is not yet present as this is the root component.
		this.fetchZKeys( {
			zids: [ 'Z1' ],
			zlangs: languageChain
		} );
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
